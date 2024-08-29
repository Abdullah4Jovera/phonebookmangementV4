import React, { useState, useEffect } from 'react';
import HomeNavbar from '../Components/navbar/Navbar';
import axios from 'axios';
import { GrView } from 'react-icons/gr';
import { Table, Modal, Button, Form, Dropdown } from 'react-bootstrap';
import Select from 'react-select';
import { MdAdd } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { CiEdit } from 'react-icons/ci';
import defaultimage from '../Assets/defaultimage.png'

const HodPhoneBook = () => {
    const [hodData, setHodData] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [error, setError] = useState(null);
    const [showViewCommentModal, setShowViewCommentModal] = useState(false);
    const [commentsToView, setCommentsToView] = useState([]);
    const [hasAccess, setHasAccess] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedCalStatus, setSelectedCalStatus] = useState(null);
    const [filteredPhonebookData, setFilteredPhonebookData] = useState([]);
    const [showAddCommentModal, setShowAddCommentModal] = useState(false);
    const [currentComment, setCurrentComment] = useState('');
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [dropdownEntry, setDropdownEntry] = useState(null);
    const [pendingStatusChange, setPendingStatusChange] = useState(null);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const navigate = useNavigate();

    const allowedRoles = [
        'HOD'
    ];

    const calStatusOptions = [
        { value: 'Interested', label: 'Interested' },
        { value: 'Rejected', label: 'Rejected' },
    ];

    const getHodPhoneBookData = async (token) => {
        try {
            const response = await axios.get(
                `/api/phonebook/get-all-phonebook`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const filteredData = response.data.filter(entry => entry.calstatus !== 'Convert to Lead');
            const sortedData = filteredData.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            setHodData(sortedData);
            setFilteredPhonebookData(sortedData);

            getAllUsers(token);
        } catch (error) {
            console.log('Error fetching HOD Phone Book data:', error);
            setError('No Phone Book Data Available.');
        }
    };

    const getAllUsers = async (token) => {
        try {
            const response = await axios.get(
                `/api/users/get-users-by-pipeline`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const users = response.data;

            const userOptions = users.map(user => ({
                value: user._id,
                label: user.name
            }));

            setAllUsers(userOptions);
        } catch (error) {
            console.log('Error fetching all users:', error);
        }
    };

    useEffect(() => {
        const phoneUserData = localStorage.getItem('phoneUserData');

        if (!phoneUserData) {
            setError('No user data found in local storage.');
            return;
        }

        const parsedUserData = JSON.parse(phoneUserData);
        const { token, role } = parsedUserData;

        if (!token) {
            setError('No token found in user data.');
            return;
        }

        if (allowedRoles.includes(role)) {
            setHasAccess(true);
            getHodPhoneBookData(token);
        } else {
            setError('You do not have access to this dashboard.');
        }
    }, []);

    useEffect(() => {
        const results = hodData.filter(entry =>
            entry.number.toLowerCase().includes(searchQuery.toLowerCase()) &&
            (!selectedUser || entry.user._id === selectedUser.value) &&
            (!selectedCalStatus || entry.calstatus === selectedCalStatus.value)
        );
        setFilteredPhonebookData(results);
    }, [searchQuery, hodData, selectedUser, selectedCalStatus]);

    const handleViewComments = (comments) => {
        setCommentsToView(comments);
        setShowViewCommentModal(true);
    };

    const handleViewCommentsClick = (entry) => {
        handleViewComments(entry.comments);
    };

    const clearSelectedUser = () => {
        setSelectedUser(null);
    };

    const clearSelectedCalStatus = () => {
        setSelectedCalStatus(null);
    };

    // Add Comment API
    const handleSaveComment = async () => {
        if (selectedEntry && currentComment.trim()) {
            try {
                const userData = JSON.parse(localStorage.getItem('phoneUserData'));
                if (userData && userData.token) {
                    await axios.post(
                        `/api/phonebook/add-comment`,
                        {
                            phonebookId: selectedEntry._id,
                            comment: currentComment
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${userData.token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    // Update local state
                    const updatedData = hodData.map(entry =>
                        entry._id === selectedEntry._id
                            ? { ...entry, comments: [...(entry.comments || []), { remarks: currentComment, createdAt: new Date() }] }
                            : entry
                    );

                    const sortedUpdatedData = updatedData.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                    setHodData(sortedUpdatedData);
                    setFilteredPhonebookData(sortedUpdatedData);
                } else {
                    navigate('/');
                }
            } catch (error) {
                console.error('Error saving comment:', error);
            }
        }
        setCurrentComment('');
        setSelectedEntry(null);
        setShowAddCommentModal(false);
    };

    const handleAddCommentClick = (entry) => {
        setSelectedEntry(entry);
        setCurrentComment('');
        setShowAddCommentModal(true);
    };

    const updateCallStatus = async (status) => {
        if (dropdownEntry) {
            try {
                const userData = JSON.parse(localStorage.getItem('phoneUserData'));
                if (userData && userData.token) {
                    await axios.put(
                        `/api/phonebook/update-calstatus/${dropdownEntry._id}`,
                        {
                            calstatus: status
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${userData.token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    const updatedData = hodData.map((entry) =>
                        entry._id === dropdownEntry._id ? { ...entry, calstatus: status } : entry
                    );
                    // Re-sort updated data by updatedAt
                    const sortedUpdatedData = updatedData.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                    setHodData(sortedUpdatedData);
                    setFilteredPhonebookData(sortedUpdatedData);
                } else {
                    navigate('/');
                }
            } catch (error) {
                console.error('Error updating call status:', error);
            }
        }

        setDropdownEntry(null); // Hide dropdown after selecting status
        setShowConvertModal(false); // Hide confirmation modal after updating
    };

    const handleCallStatusChange = (status) => {
        if (status === 'Convert to Lead') {
            setPendingStatusChange(status);
            setShowConvertModal(true);
        } else {
            updateCallStatus(status);
        }
    };

    const handleConfirmConversion = () => {
        updateCallStatus(pendingStatusChange);
    };

    return (
        <>
            <HomeNavbar />
            <div className="phonebook-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px', alignItems: 'center' }}>
                    <Form.Group controlId="searchBarNumber" className='w-100'>
                        <Form.Control
                            type="text"
                            placeholder="Search by Number"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group controlId="selectUser" className='w-100'>
                        <Select
                            options={allUsers}
                            value={selectedUser}
                            onChange={setSelectedUser}
                            placeholder="Select User"
                            isClearable
                        />
                    </Form.Group>

                    <Form.Group controlId="selectCalStatus" className='w-100'>
                        <Select
                            options={calStatusOptions}
                            value={selectedCalStatus}
                            onChange={setSelectedCalStatus}
                            placeholder="Select Call Status"
                            isClearable
                        />
                    </Form.Group>
                </div>

                <div>
                    {error ? (
                        <p style={{ color: 'red' }}>{error}</p>
                    ) : hasAccess ? (
                        filteredPhonebookData.length > 0 ? (
                            <Table striped bordered hover responsive className='mt-3'>
                                <thead>
                                    <tr className='teble_tr_class'>
                                        <th className="equal-width">Number</th>
                                        <th className="equal-width">Status</th>
                                        <th className="equal-width">Call Status</th>
                                        <th className="equal-width">Change Status</th>
                                        <th className="equal-width">Pipeline</th>
                                        <th className="equal-width">User</th>
                                        <th className="equal-width">Add Comments</th>
                                        <th className="equal-width">View Comments</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPhonebookData.map((entry, index) => (
                                        <tr key={index}>
                                            <td style={{ textAlign: 'center' }}>{entry.number}</td>
                                            <td style={{ textAlign: 'center' }}>{entry.status}</td>
                                            <td
                                                style={{
                                                    textAlign: 'center',
                                                    backgroundColor: entry.calstatus === 'Interested' ? 'green' : entry.calstatus === 'Rejected' ? 'red' : 'transparent',
                                                    color: entry.calstatus === 'Interested' || entry.calstatus === 'Rejected' ? 'white' : 'inherit'
                                                }}
                                            >
                                                {entry.calstatus}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {dropdownEntry && dropdownEntry._id === entry._id ? (
                                                    <Dropdown>
                                                        <Dropdown.Toggle className="dropdown_menu" id="dropdown-basic">
                                                            {entry.calstatus || 'Select Status'}
                                                        </Dropdown.Toggle>
                                                        <Dropdown.Menu>
                                                            <Dropdown.Item onClick={() => handleCallStatusChange('Req to call')}>Req to call</Dropdown.Item>
                                                            <Dropdown.Item onClick={() => handleCallStatusChange('Interested')}>Interested</Dropdown.Item>
                                                            <Dropdown.Item onClick={() => handleCallStatusChange('Rejected')}>Rejected</Dropdown.Item>
                                                            <Dropdown.Item onClick={() => handleCallStatusChange('Convert to Lead')}>Convert to Lead</Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                ) : (
                                                    <CiEdit
                                                        onClick={() => setDropdownEntry(entry)}
                                                        style={{ fontSize: '20px', cursor: 'pointer' }}
                                                    />
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{entry.pipeline.name}</td>
                                            <td style={{ textAlign: 'center' }}>{entry.user.name}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <MdAdd onClick={() => handleAddCommentClick(entry)} style={{ fontSize: '20px', cursor: 'pointer' }} />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <GrView onClick={() => handleViewCommentsClick(entry)} style={{ fontSize: '20px', cursor: 'pointer' }} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : (
                            <p className='text-center mt-5'>No Data Available</p>
                        )
                    ) : (
                        <p>You do not have access to this page.</p>
                    )}
                </div>

                {/* View Comments Modal */}
                <Modal show={showViewCommentModal} onHide={() => setShowViewCommentModal(false)} size='lg' >
                    <Modal.Header closeButton>
                        <Modal.Title>View Comments</Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ height: 'auto', maxHeight: '700px', overflowY: 'scroll' }} >
                        <ul>
                            {commentsToView.length > 0 ? (
                                commentsToView.map((comment, index) => (
                                    <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', padding: '10px 0', }} >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} >
                                            <img
                                                src={comment.user?.image || defaultimage}
                                                alt="User image"
                                                className='image_url_default'
                                                onError={(e) => {
                                                    e.target.onerror = null; // Prevents infinite loop in case defaultimage also fails
                                                    e.target.src = defaultimage; // Fallback to default image
                                                }}
                                            />

                                            <div>
                                                <p className='mb-0'>{comment?.remarks && comment?.remarks ? comment?.remarks : 'No Comments Available'}</p>
                                                <small> {comment.user?.name && comment.user?.name ? comment.user.name : 'Unknown User'} </small>
                                            </div>
                                        </div>

                                        <small>
                                            {`${new Date(comment.createdAt).toDateString()} - ${new Date(comment.createdAt).toLocaleTimeString()}`}
                                        </small>

                                    </li>
                                ))
                            ) : (
                                <p>No Comments Available.</p>
                            )}
                        </ul>
                    </Modal.Body>
                    {/* <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowViewCommentModal(false)}>
                            Close
                        </Button>
                    </Modal.Footer> */}
                </Modal>

                {/* Add Comment Modal */}
                <Modal show={showAddCommentModal} onHide={() => setShowAddCommentModal(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Add Comment</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group controlId="commentTextarea">
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={currentComment}
                                onChange={(e) => setCurrentComment(e.target.value)}
                                placeholder="Enter your comment here"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAddCommentModal(false)}>
                            Close
                        </Button>
                        <Button variant="secondary" onClick={handleSaveComment}>
                            Save Comment
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* Convert to Lead Confirmation Modal */}
                <Modal show={showConvertModal} onHide={() => setShowConvertModal(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Confirm Conversion</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>Are you sure you want to convert this status to Lead?</Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowConvertModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleConfirmConversion}>
                            Confirm
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        </>
    );
};

export default HodPhoneBook;
